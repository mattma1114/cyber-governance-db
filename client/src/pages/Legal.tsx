import { Link } from "wouter";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Legal() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="gap-2 mb-6 -ml-2">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Link>
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">法律声明</h1>
          </div>
          <p className="text-sm text-muted-foreground">最后更新：2025年1月</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">一、版权声明</h2>
            <p className="text-muted-foreground leading-relaxed">
              本数据库（互联网平台治理数据库）由浙江传媒学院建立并运营维护。本数据库中的所有原创内容，
              包括但不限于案例摘要、分析解读、平台画像及数据库结构，均受中华人民共和国著作权法及相关
              国际条约保护，版权归浙江传媒学院所有。
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              未经书面授权，任何单位或个人不得以任何形式复制、转载、摘编或以其他方式使用本数据库的
              原创内容。学术引用须注明出处。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">二、内容免责声明</h2>
            <p className="text-muted-foreground leading-relaxed">
              本数据库收录的案例信息、法规文本及分析内容仅供学术研究和参考使用，不构成任何法律意见
              或专业建议。本数据库不对因使用本数据库内容而产生的任何直接或间接损失承担责任。
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              本数据库尽力确保信息的准确性和时效性，但不对信息的完整性、准确性或最新性作出任何明示
              或默示的保证。如发现信息有误，欢迎通过联系方式反馈。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">三、第三方内容</h2>
            <p className="text-muted-foreground leading-relaxed">
              本数据库收录的部分内容来源于公开的司法文书、监管公告、立法文件及新闻报道，相关版权归
              原始发布机构所有。本数据库对原始内容的引用均遵循合理使用原则，并尽可能注明来源。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">四、隐私政策</h2>
            <p className="text-muted-foreground leading-relaxed">
              本数据库仅收集用户登录所必需的基本信息（通过 Manus OAuth 授权），不收集、存储或共享
              用户的个人敏感信息。用户的浏览记录和搜索行为仅用于改善数据库服务质量，不用于商业目的。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">五、适用法律</h2>
            <p className="text-muted-foreground leading-relaxed">
              本声明受中华人民共和国法律管辖。如因本声明或本数据库的使用产生任何争议，应提交浙江省
              杭州市有管辖权的人民法院解决。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">六、联系方式</h2>
            <p className="text-muted-foreground leading-relaxed">
              如对本法律声明有任何疑问，或需申请内容授权，请联系：
            </p>
            <div className="mt-3 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground font-medium">浙江传媒学院 互联网平台治理数据库项目组</p>
              <p className="text-sm text-muted-foreground mt-1">电子邮件：cyberdb@zjicm.edu.cn</p>
              <p className="text-sm text-muted-foreground">地址：浙江省杭州市下沙高教园区学源街998号</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
